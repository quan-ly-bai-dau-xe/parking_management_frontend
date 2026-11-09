import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeToE164Phone,
  sendPhoneOtp,
  verifyPhoneOtp,
} from '../src/services/firebaseAuthService.js';

test('normalizeToE164Phone chuyển đổi đúng định dạng số điện thoại Việt Nam', () => {
  assert.equal(normalizeToE164Phone('0901234567'), '+84901234567');
  assert.equal(normalizeToE164Phone('0766709535'), '+84766709535');
  assert.equal(normalizeToE164Phone('+84901234567'), '+84901234567');
  assert.equal(normalizeToE164Phone('84901234567'), '+84901234567');
  assert.equal(normalizeToE164Phone('090 123 4567'), '+84901234567');
  assert.equal(normalizeToE164Phone('090.123.4567'), '+84901234567');
});

test('sendPhoneOtp và verifyPhoneOtp hoạt động chính xác trong chế độ test/fallback', async () => {
  const result = await sendPhoneOtp('0901234567');
  assert.equal(result.success, true);
  assert.equal(result.formattedPhone, '+84901234567');

  // Kiểm tra xác thực mã OTP chính xác (123456)
  const verifySuccess = await verifyPhoneOtp('123456');
  assert.equal(verifySuccess.success, true);

  // Kiểm tra mã OTP sai -> ném lỗi
  await assert.rejects(
    async () => {
      await verifyPhoneOtp('999999');
    },
    {
      name: 'Error',
      message: 'Mã OTP không chính xác. (Mã thử nghiệm là: 123456)',
    }
  );
});

