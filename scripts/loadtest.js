import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests must complete below 300ms
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080/api/v1';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token',
  };

  // 1. Fetch today's summary
  const dayRes = http.get(`${BASE_URL}/days/2026-10-12`, { headers });
  check(dayRes, {
    'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
  });

  // 2. Search foods
  const searchRes = http.get(`${BASE_URL}/foods?q=pho&limit=10`);
  check(searchRes, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
