const fs = require('fs');
const p = 'app/(site)/[locale]/pricing/plans/[id]/page.tsx';
let s = fs.readFileSync(p, 'utf8');

const pairs = [
  [
    'Fill this for the person the share is booked for. After booking, other buyers see your\n              photo, name, profession, and city — so they can tell who already invested. NID, phone,\n              and full address stay private.',
    "{t('step2Hint')}"
  ],
  ['Shown on this plan after booking', "{t('shownAfter')}"],
  ['alt="Your photograph"', "alt={t('photoAlt')}"],
  ['Photo\n                        <br />\n                        required', "{t('photoRequired')}"],
  ['Uploading…', "{t('uploading')}"],
  ['Full name', "{t('kycName')}"],
  ['Profession', "{t('kycProfession')}"],
  ['placeholder="e.g. Businessman, Doctor, Teacher"', "placeholder={t('professionPlaceholder')}"],
  ['City / district', "{t('kycCity')}"],
  ['placeholder="e.g. Dhaka, Chattogram"', "placeholder={t('cityPlaceholder')}"],
  ['>Preview<', ">{t('preview')}<"],
  ["name: kyc.name.trim() || 'Your name'", "name: kyc.name.trim() || t('yourName')"],
  ['Private — only our team sees this', "{t('privateOnly')}"],
  ['Father / husband name', "{t('kycFatherName')}"],
  ['NID number', "{t('kycNid')}"],
  ['Date of birth', "{t('kycDob')}"],
  ['Contact number', "{t('kycContact')}"],
  ['>Email\n', ">{t('kycEmail')}\n"],
  ['Present address', "{t('kycAddress')}"],
  ['Permanent address', "{t('kycPermanentAddress')}"],
  ['Nominee name', "{t('kycNomineeName')}"],
  ['Nominee NID', "{t('kycNomineeNid')}"],
  ['Nominee photograph ', "{t('nomineePhoto')} "],
  ['(required, stays private)', "{t('nomineePrivate')}"],
  ['Uploading photo…', "{t('uploadingPhoto')}"],
  ['alt="Nominee photograph"', "alt={t('nomineeAlt')}"],
  ['>Uploaded<', ">{t('uploaded')}<"],
  ['Choose a photo — it uploads automatically', "{t('choosePhoto')}"],
  ['3. How you’ll pay today', "{t('step3')}"],
  [
    'Send the amount due today by cheque, cash/pay order, or bank transfer, then add the\n              reference so we can match it.',
    "{t('step3Hint')}"
  ],
  ['Referral code ', "{t('referralOptional')} "],
  ['(optional)', "{t('optional')}"],
  ['placeholder="Enter referrer code if you have one"', "placeholder={t('referralPlaceholder')}"],
  ['aria-label="Deposit payment method"', "aria-label={t('depositMethodAria')}"],
  ["label: 'Cheque'", "label: t('depositCheque')"],
  ["label: 'Cash / pay order'", "label: t('depositCash')"],
  ["label: 'Online transfer'", "label: t('depositOnline')"],
  ['Payment reference', "{t('paymentReference')}"],
  ["? 'Cheque number'", "? t('refCheque')"],
  ["? 'Pay order / receipt number'", "? t('refPayOrder')"],
  [": 'Bank transfer reference'", ": t('refTransfer')"],
  ['Note (optional)', "{t('noteOptional')}"],
  ['placeholder="Bank name, branch, or other details"', "placeholder={t('notePlaceholder')}"],
  ['Proof of payment (optional)', "{t('proofOptional')}"],
  ['alt="Payment proof"', "alt={t('proofAlt')}"],
];

let hit = 0;
for (const [a, b] of pairs) {
  if (s.includes(a)) {
    s = s.split(a).join(b);
    hit++;
  } else console.warn('MISS', a.slice(0, 60));
}
console.log('kyc/deposit hit', hit);
fs.writeFileSync(p, s);
