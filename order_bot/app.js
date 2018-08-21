// This loads the environment variables from the .env file
require('dotenv-extended').load();
const restify = require('restify');
const builder = require('botbuilder');
// const personNumber = {
//     "1.": '1-2;',
//     "2.": '3-4;',
//     "3.": '5-6'
// };
const personNumber = [ "1-2;",
    "3-4;",
    "5-6"];


// Setup Restify Server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users
server.post('/api/messages', connector.listen());
const inMemoryStorage = new builder.MemoryBotStorage();
// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
const bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the dinner reservation.");
        builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
    },
    function (session, results) {
        session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
        builder.Prompts.choice(session, "How many people are in your party?", personNumber,{ listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.dialogData.partySize = results.response.entity;
        builder.Prompts.text(session, "Whose name will this reservation be under?");
    },
    function (session, results) {
        session.dialogData.reservationName = results.response;

        // Process request and display reservation details
        session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize} <br/>Reservation name: ${session.dialogData.reservationName}`);
        builder.Prompts.confirm(session, "Are you sure for this order?");
    },
    function (session, results) {
        session.dialogData.placeOrder = results.response;

        if (session.dialogData.placeOrder) {
            // Process request and display reservation details
            session.send('Thanks for your order!');
        } else {
            session.send('The order is cancelled!');
        }

        session.endDialog();
    }
]).set('storage', inMemoryStorage);