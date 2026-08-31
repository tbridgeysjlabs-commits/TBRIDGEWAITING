import { Server } from 'socket.io';

/**
 * Socket.io hub (단일 인스턴스 / in-memory).
 * 추후 다중 인스턴스 시 Redis Adapter만 이 모듈에 붙이면 된다.
 *
 *   import { createAdapter } from '@socket.io/redis-adapter';
 *   import { createClient } from 'redis';
 *   // pub/sub 클라이언트 연결 후:
 *   io.adapter(createAdapter(pubClient, subClient));
 */

let io = null;

export function facilityRoom(facilityCode) {
  return `facility:${String(facilityCode || '').trim().toLowerCase()}`;
}

/**
 * @param {import('http').Server} httpServer
 * @param {{ allowedOrigins?: string[] }} [options]
 */
export function initSocketServer(httpServer, { allowedOrigins = [] } = {}) {
  if (io) return io;

  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/$/, '');
        if (!allowedOrigins.length || allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        console.warn(`[socket] blocked origin: ${origin}`);
        return callback(null, false);
      },
      credentials: true,
    },
    // transports: websocket 우선, polling fallback
  });

  // ── Redis Adapter 자리 (미사용) ──────────────────────────────
  // if (process.env.REDIS_URL) {
  //   await attachRedisAdapter(io, process.env.REDIS_URL);
  // }

  io.on('connection', (socket) => {
    socket.on('facility:join', (payload = {}, ack) => {
      const code = String(payload.facilityCode || '').trim();
      if (!code) {
        if (typeof ack === 'function') ack({ ok: false, error: 'facilityCode required' });
        return;
      }
      for (const room of socket.rooms) {
        if (typeof room === 'string' && room.startsWith('facility:')) {
          socket.leave(room);
        }
      }
      const room = facilityRoom(code);
      socket.join(room);
      socket.data.facilityCode = code;
      if (typeof ack === 'function') ack({ ok: true, room });
    });

    socket.on('facility:leave', (payload = {}) => {
      const code = String(payload.facilityCode || '').trim();
      if (code) socket.leave(facilityRoom(code));
    });
  });

  console.log('[socket] Socket.io ready (in-memory, single instance)');
  return io;
}

export function getIO() {
  return io;
}

export function emitFacility(facilityCode, event, payload = {}) {
  if (!io || !facilityCode) return;
  io.to(facilityRoom(facilityCode)).emit(event, {
    facilityCode,
    at: new Date().toISOString(),
    ...payload,
  });
}

/**
 * 대기 상태 변경 공통 emit.
 * reason: registered | called | completed | cancelled | postponed | updated
 */
export function emitWaitingChanged(facilityCode, { reason, waitingId, waiting } = {}) {
  if (!facilityCode) return;
  const base = { reason, waitingId: waitingId ?? waiting?.id ?? null, waiting: waiting ?? null };

  // 보드/리스트 공통 갱신 신호
  emitFacility(facilityCode, 'waiting:changed', base);

  if (reason === 'called') {
    emitFacility(facilityCode, 'waiting:called', base);
    emitFacility(facilityCode, 'signage:call', base);
  } else if (reason === 'cancelled') {
    emitFacility(facilityCode, 'waiting:cancelled', base);
    emitFacility(facilityCode, 'waiting:updated', base);
  } else {
    emitFacility(facilityCode, 'waiting:updated', base);
  }
}
