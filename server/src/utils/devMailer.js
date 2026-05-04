function sendDevEmail({ to, subject, body }) {
  const email = {
    to,
    subject,
    body,
    sentAt: new Date(),
  };

  console.log('\n--- EventEase Dev Email ---');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log(body);
  console.log('--- End Dev Email ---\n');

  return email;
}

module.exports = { sendDevEmail };
