import assert from 'node:assert/strict';
import { applyIatMessage } from '../src/lib/iflytek-realtime';

const first = applyIatMessage(
  { committed: '', pending: '' },
  JSON.stringify({
    code: 0,
    data: {
      status: 1,
      result: { ws: [{ cw: [{ w: '你好' }] }] },
    },
  }),
);

assert.equal(first.text, '你好');
assert.equal(first.done, false);

const second = applyIatMessage(
  first,
  JSON.stringify({
    code: 0,
    data: {
      status: 2,
      result: { pgs: 'apd', ws: [{ cw: [{ w: '世界' }] }] },
    },
  }),
);

assert.equal(second.text, '你好世界');
assert.equal(second.done, true);
