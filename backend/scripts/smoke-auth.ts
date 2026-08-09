/**
 * Local smoke for soft email verify + forgot/change password.
 * Runs AuthService in memory mode (no DATABASE_URL) with a capturing mail stub.
 */
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../src/auth/auth.service';
import { MailService } from '../src/mail/mail.service';

class CapturingMail extends MailService {
  verifyUrl = '';
  resetUrl = '';

  async sendEmailVerification(opts: { to: string; name: string; verifyUrl: string }) {
    this.verifyUrl = opts.verifyUrl;
    console.log(`  [mail] verify -> ${opts.to}`);
    return { ok: true as const };
  }

  async sendPasswordReset(opts: { to: string; name: string; resetUrl: string }) {
    this.resetUrl = opts.resetUrl;
    console.log(`  [mail] reset -> ${opts.to}`);
    return { ok: true as const };
  }
}

function assert(cond: any, msg: string) {
  if (!cond) throw new Error(msg);
}

function tokenFromUrl(url: string) {
  const u = new URL(url);
  const t = u.searchParams.get('token');
  assert(t, `missing token in ${url}`);
  return t!;
}

async function main() {
  delete process.env.DATABASE_URL;
  process.env.PUBLIC_SITE_URL = 'http://localhost:3000';
  process.env.JWT_SECRET = 'smoke-secret';

  const mail = new CapturingMail();
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  const auth = new AuthService(jwt, mail);

  const email = `smoke-${Date.now()}@example.com`;
  const password = 'OldPass123!';
  const name = 'Smoke Tester';

  console.log('1) register (sends verify email)');
  const reg = await auth.register(name, email, password);
  assert(reg && reg.emailVerified === false, 'register should create unverified user');
  assert(mail.verifyUrl, 'verify email URL missing');

  console.log('2) login allowed while unverified');
  const login1 = await auth.login(email, password);
  assert(login1?.token, 'login should succeed unverified');
  assert(login1?.user.emailVerified === false, 'login user should be unverified');
  assert((await auth.isEmailVerified(login1!.user.id)) === false, 'isEmailVerified should be false');

  console.log('3) verify email via token');
  const verifyToken = tokenFromUrl(mail.verifyUrl);
  const verified = await auth.verifyEmail(verifyToken);
  assert(verified.ok, `verify failed: ${(verified as any).error}`);
  assert((await auth.isEmailVerified(login1!.user.id)) === true, 'should be verified after token');

  console.log('4) forgot password (sends reset email)');
  const forgot = await auth.forgotPassword(email);
  assert(forgot.ok, 'forgotPassword should return ok');
  assert(mail.resetUrl, 'reset email URL missing');

  console.log('5) reset password via token');
  const resetToken = tokenFromUrl(mail.resetUrl);
  const newPass = 'NewPass456!';
  const reset = await auth.resetPassword(resetToken, newPass);
  assert(reset.ok, `reset failed: ${(reset as any).error}`);

  console.log('6) old password rejected, new password works');
  assert(!(await auth.login(email, password)), 'old password should fail');
  const login2 = await auth.login(email, newPass);
  assert(login2?.token, 'login with new password should work');

  console.log('7) change password while signed in');
  const changed = await auth.changePassword(login2!.token, newPass, 'FinalPass789!');
  assert(changed.ok, `changePassword failed: ${(changed as any).error}`);
  assert(!(await auth.login(email, newPass)), 'previous password should fail after change');
  const login3 = await auth.login(email, 'FinalPass789!');
  assert(login3?.token, 'login with changed password should work');

  console.log('8) wrong current password rejected');
  const bad = await auth.changePassword(login3!.token, 'wrong', 'AnotherPass1!');
  assert(!bad.ok && (bad as any).error === 'invalid_current_password', 'expected invalid_current_password');

  console.log('9) unknown forgot-password still ok (no enumeration)');
  const ghost = await auth.forgotPassword('nobody-exists@example.com');
  assert(ghost.ok, 'forgotPassword should always return ok');

  console.log('\nSMOKE OK: email verify + forgot/reset/change password');
}

main().catch((e) => {
  console.error('\nSMOKE FAILED:', e?.message || e);
  process.exit(1);
});
