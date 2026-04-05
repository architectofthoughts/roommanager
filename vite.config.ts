import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const DEV_PIN_STORE_PATH = '.roommanager-dev/pin-backups.json'
const REMOTE_PIN_PATTERN = /^\d{4}$/

interface DevStoredPinBackupRecord {
  pin: string;
  savedAt: string;
  backup: {
    app: 'roommanager';
    version: 1;
    exportedAt: string;
    themeMode: 'light' | 'dark';
    data: {
      rooms: unknown[]
      activeRoomId: string
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRoomManagerBackup(value: unknown): value is DevStoredPinBackupRecord['backup'] {
  if (!isRecord(value)) return false
  if (value.app !== 'roommanager' || value.version !== 1) return false
  if (typeof value.exportedAt !== 'string') return false
  if (value.themeMode !== 'light' && value.themeMode !== 'dark') return false
  if (!isRecord(value.data)) return false
  if (!Array.isArray(value.data.rooms)) return false
  return typeof value.data.activeRoomId === 'string'
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) {
    throw new Error('요청 본문이 비어 있습니다.')
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8')) as unknown
}

async function readDevPinStore(filePath: string) {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw) as Record<string, DevStoredPinBackupRecord>
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }

    throw error
  }
}

async function writeDevPinStore(filePath: string, records: Record<string, DevStoredPinBackupRecord>) {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(records, null, 2), 'utf-8')
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(payload))
}

function createPinBackupDevPlugin(): Plugin {
  const filePath = resolve(process.cwd(), DEV_PIN_STORE_PATH)

  return {
    name: 'pin-backup-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/pin-backups', async (request, response, next) => {
        const path = (request.url ?? '/').split('?')[0]

        try {
          if (request.method === 'POST' && (path === '/' || path === '')) {
            const payload = await readJsonBody(request)
            if (!isRecord(payload)) {
              sendJson(response, 400, { error: '잘못된 요청 형식입니다.' })
              return
            }

            const pin = typeof payload.pin === 'string' ? payload.pin.trim() : ''
            if (!REMOTE_PIN_PATTERN.test(pin)) {
              sendJson(response, 400, { error: 'PIN은 4자리 숫자여야 합니다.' })
              return
            }

            if (!isRoomManagerBackup(payload.backup)) {
              sendJson(response, 400, { error: '저장할 작업 공간 데이터 형식이 올바르지 않습니다.' })
              return
            }

            const records = await readDevPinStore(filePath)
            const record: DevStoredPinBackupRecord = {
              pin,
              savedAt: new Date().toISOString(),
              backup: payload.backup,
            }

            records[pin] = record
            await writeDevPinStore(filePath, records)
            sendJson(response, 200, { pin: record.pin, savedAt: record.savedAt })
            return
          }

          if (request.method === 'GET') {
            const pin = path.replace(/^\/+/, '')
            if (!REMOTE_PIN_PATTERN.test(pin)) {
              sendJson(response, 400, { error: 'PIN은 4자리 숫자여야 합니다.' })
              return
            }

            const records = await readDevPinStore(filePath)
            const record = records[pin]
            if (!record) {
              sendJson(response, 404, { error: '해당 PIN으로 저장된 작업 공간이 없습니다.' })
              return
            }

            sendJson(response, 200, record)
            return
          }
        } catch (error) {
          sendJson(response, 500, {
            error: error instanceof Error ? error.message : '로컬 PIN 저장소를 처리하지 못했습니다.',
          })
          return
        }

        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), createPinBackupDevPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'konva': ['konva', 'react-konva'],
        },
      },
    },
  },
})
