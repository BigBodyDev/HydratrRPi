const admin = require("firebase-admin");
const player = require("play-sound")(opts = {});

// Fetch the service account key JSON file contents
var serviceAccount = require("./hydratr-water-reminders-firebase-adminsdk-lclka-d7366d2635.json");

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hydratr-water-reminders.firebaseio.com/"
});

var registrationToken = "fBnIPhcf7kQToLZOkW5Gum:APA91bFQT3eCo49GIMta7Ubc_yu_Fwd9lhteLrfdANqu0I6Bwy_qg8m4Cok7dHxrg2q2Vbpr7JV3fs7hqYs9sc2e5j-u_kqby6DJsq8eaYUhv4snT832Iq6Au5yCKYZ56JWz5jWQpnOl";
var payload = {
  notification: {
    title: "Your Hydratr Bottle is Online!",
    body: "Remember to drink water 😉"
  }
};
var options = {
  priority: "normal",
  timeToLive: 60 * 60
};

admin.messaging().sendToDevice(registrationToken, payload, options)
  .then(function(response) {
    console.log("Successfully sent initialization message:", response);
  })
  .catch(function(error) {
    console.log("Error sending initialization message:", error);
  });

console.log("Hydratr is active")

// As an admin, the app has access to read and write all data, regardless of Security Rules
var db = admin.database();

var timeouts = [];

var interval;
var soundHasPlayed = false;
var sound;

db.ref("/Manager_Data/buzzer_active").on("value", function(snapshot){
  var active = snapshot.val();
  if (active == true){
    sound = player.play("beacon.mp3", function(err){
      if (err) throw err;
    });
    interval = setInterval(function () {
      soundHasPlayed = true;
      sound = player.play("beacon.mp3", function(err){
        if (err) throw err;
      });
    }, 4000);
  }else{
    if (soundHasPlayed){
      sound.kill();
      clearInterval(interval);
    }
  }
});

db.ref("/").on("value", function(snapshot) {

  console.log("\n\n\n\n\n========== NEW FIREBASE INSTANCE ==========");

  // Cancel all previously scheduled timeouts
  for(var x = 0; x < timeouts.length; x++){
    clearTimeout(timeouts[x]);
  }

  timeouts = [];

  if (snapshot.val().Manager_Data.reminders_active){
    for (key in snapshot.val().Reminders){
      var value = snapshot.val().Reminders[key];

      var now = new Date();
      var originalDate = new Date(Date.parse(value.time));

      var nowMilliseconds = now.getTime();
      var originalDateMilliseconds = originalDate.getTime();

      while (originalDateMilliseconds <= nowMilliseconds){
        originalDate.setDate(originalDate.getDate() + 1);
        originalDateMilliseconds = originalDate.getTime();
      }

      var date = new Date(originalDate);

      var milliseconds = date.getTime();
      timeouts.push(getTimeout(milliseconds, value.id));
    }
  }
});



function getTimeout(milliseconds, id) {
  // Get the current date object
  var now = new Date();

  // Get the number of milliseconds between now and the alarm date
  var timeBetween = milliseconds - now.getTime();

  // Here is the timeout we will call
  var out = setTimeout(function () {
    console.log(id)
    var buzzerRef = db.ref("Manager_Data");
    buzzerRef.update({"buzzer_active": true});

  }, timeBetween);

  // return the created timeout
  return out;
}
