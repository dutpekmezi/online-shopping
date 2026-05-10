const admin = require("firebase-admin");

const serviceAccount = require("./edacraftatelier-d4f4b-firebase-adminsdk-fbsvc-21fa295a59.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = "osAXi2IxzpTGZh5JjpvJ1Q8hl0s2";

admin
  .auth()
  .setCustomUserClaims(uid, {
    admin: true,
  })
  .then(() => {
    console.log("user set as admin");
    process.exit();
  })
  .catch((error) => {
    console.error(error);
  });