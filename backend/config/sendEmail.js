let nodemailer = require('nodemailer')

const sendEmail = async (to, subject,text)=>{
  const transporter = nodemailer.createTransport({
    service:'Gmail',
    auth:{
      user:'vedsingh0104@gmail.com',
      pass:'zoxw cwfo fjnv cytz',
    }
  });

  const mailOptions = {
  from: 'vedsingh0104@gmail.com',
  to,
  subject,
  text,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;


// const sendEmail = async (to, subject, text) => {
//   const transporter = nodemailer.createTransport({
//     service: 'Gmail', 
//     auth: {
//       user: 'rudhg35@gmail.com', 
//       pass: 'ydyz xums zhms iwwj', 
//     },
//   });

//   const mailOptions = {
//     from: 'rudhg35@gmail.com',
//     to,
//     subject,
//     text,
//   };

//   await transporter.sendMail(mailOptions);
// };

module.exports = { sendEmail };