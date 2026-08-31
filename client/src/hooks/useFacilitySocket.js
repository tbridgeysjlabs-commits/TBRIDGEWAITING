import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_ORIGIN = import.meta.env.VITE_API_BASE_URL
  ? String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')
  : undefined;

const FACILITY_EVENTS = ['waiting:changed'];

/**
 * 시설 단위 Socket.io 구독.
 * - facilityCode room join
 * - waiting:changed 수신 시 onEvent (보드/상태 REST 재조회)
 * - 재연결 시 onReconnect (REST fallback)
 *
 * 서버는 waiting:called / waiting:updated / waiting:cancelled / signage:call 도
 * 함께 emit 하므로, 화면별 특수 처리가 필요하면 이벤트를 추가 구독하면 된다.
 */
export function useFacilitySocket(facilityCode, { onEvent, onReconnect } = {}) {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  onEventRef.current = onEvent;
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    if (!facilityCode) return undefined;

    const socket = io(SOCKET_ORIGIN, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      autoConnect: true,
    });

    let everConnected = false;

    const join = () => {
      socket.emit('facility:join', { facilityCode });
    };

    socket.on('connect', () => {
      join();
      if (everConnected) {
        onReconnectRef.current?.();
      }
      everConnected = true;
    });

    const handleEvent = (payload) => {
      onEventRef.current?.(payload);
    };
    for (const event of FACILITY_EVENTS) {
      socket.on(event, handleEvent);
    }

    return () => {
      socket.emit('facility:leave', { facilityCode });
      for (const event of FACILITY_EVENTS) {
        socket.off(event, handleEvent);
      }
      socket.off('connect');
      socket.disconnect();
    };
  }, [facilityCode]);
}
