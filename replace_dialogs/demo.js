// This loads the environment variables from the .env file
require('dotenv-extended').load();
const restify = require('restify');
const builder = require('botbuilder');


var menu = require('./menuItems');
var menuItems = menu.consoleMenu;
const dinnerMenu = menu.dinnerMenu;
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
// This is a reservation bot that has a menu of offerings.
var bot = new builder.UniversalBot(connector, [
    function(session){
        session.send("Welcome to Pactera Hotel.");
        session.beginDialog("mainMenu");
    }
]).set('storage', inMemoryStorage); // Register in-memory storage

// Display the main menu and start a new request depending on user input.
bot.dialog("mainMenu", [
    function(session){
        builder.Prompts.choice(session, "Main Menu:", menuItems);
    },
    function(session, results){
        if(results.response){
            session.beginDialog(menuItems[results.response.entity].item);
        }
    }
])
    .triggerAction({
        // The user can request this at any time.
        // Once triggered, it clears the stack and prompts the main menu again.
        matches: /^Main Menu$/i,
        confirmPrompt: "This will cancel your request. Are you sure?"
    });


// Menu: "Order dinner"
// This dialog allows user to order dinner and have it delivered to their room.
bot.dialog('orderDinner', [
    function(session){
        session.send("Lets order some dinner!");
        session.beginDialog("addDinnerItem");
    },
    function (session, results) {
        if (results.response) {
            // Display itemize order with price total.
            for(var i = 1; i < session.conversationData.orders.length; i++){
                session.send(`You ordered: ${session.conversationData.orders[i].Description} for a total of $${session.conversationData.orders[i].Price}.`);
            }
            session.send(`Your total is: $${session.conversationData.orders[0].Price}`);

            // Continue with the check out process.
            builder.Prompts.text(session, "What is your room number?");
        }
    },
    function(session, results){
        if(results.response){
            session.dialogData.room = results.response;
            var msg = `Thank you. Your order will be delivered to room #${results.response}.`;
            session.send(msg);
            session.replaceDialog("mainMenu"); // Display the menu again.
        }
    }
])
    .reloadAction(
        "restartOrderDinner", "Ok. Let's start over.",
        {
            matches: /^start over$/i
        }
    )
    .cancelAction(
        "cancelOrder", "Type 'Main Menu' to continue.",
        {
            matches: /^cancel$/i,
            confirmPrompt: "This will cancel your order. Are you sure?"
        }
    );

bot.dialog('dinnerReservation', [
    function (session) {
        session.send("Welcome to the dinner reservation.");
        session.beginDialog('askForDateTime');
    },
    function (session, results) {
        session.dialogData.reservationDate = builder.EntityRecognizer.resolveTime([results.response]);
        session.beginDialog('askForPartySize');
    },
    function (session, results) {
        session.dialogData.partySize = results.response;
        session.beginDialog('askForReserverName');
    },
    function (session, results) {
        session.dialogData.reservationName = results.response;

        // Process request and display reservation details
        session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.reservationDate} <br/>Party size: ${session.dialogData.partySize} <br/>Reservation name: ${session.dialogData.reservationName}`);
        session.endDialog();
    }
])

// Dialog to ask for a date and time
bot.dialog('askForDateTime', [
    function (session) {
        builder.Prompts.time(session, "Please provide a reservation date and time (e.g.: June 6th at 5pm)");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

// Dialog to ask for number of people in the party
bot.dialog('askForPartySize', [
    function (session) {
        builder.Prompts.text(session, "How many people are in your party?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]).beginDialogAction('partySizeHelpAction', 'partySizeHelp', { matches: /^help$/i });

// Dialog to ask for the reservation name.
bot.dialog('askForReserverName', [
    function (session) {
        builder.Prompts.text(session, "Who's name will this reservation be under?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);


// Add dinner items to the list by repeating this dialog until the user says `check out`.
bot.dialog("addDinnerItem", [
    function(session, args){
        if(args && args.reprompt){
            session.send("What else would you like to have for dinner tonight?");
        }
        else{
            // New order
            // Using the conversationData to store the orders
            session.conversationData.orders = new Array();
            session.conversationData.orders.push({
                Description: "Check out",
                Price: 0
            })
        }
        builder.Prompts.choice(session, "Dinner menu:", dinnerMenu, {listStyle: builder.ListStyle.button});
    },
    function(session, results){
        console.log("####"+results.response.entity);
        console.log("####"+results.response.entity.match(/^Check out$/i));
        if(results.response){
            if(results.response.entity.match(/^Check out$/i)){
                session.endDialog("Checking out...");
            }
            else {
                var order = dinnerMenu[results.response.entity];
                session.conversationData.orders[0].Price += order.Price; // Add to total.
                if(session.conversationData.orders.length>0){
                }
                var msg = `You ordered: ${order.Description} for a total of $${order.Price}.`;
                session.send(msg);
                session.conversationData.orders.push(order);

                session.replaceDialog("addDinnerItem", { reprompt: true }); // Repeat dinner menu
            }
        }
    },
    function(session, results){
        if(results.response){
            if(results.response.entity.match(/^check out$/i)){
                session.endDialog("Checking out...");
            }
            else if(results.response.entity.match(/^cancel/i)){
                // Cancel the order and start "mainMenu" dialog.
                session.cancelDialog(0, "mainMenu");
            }
            else {
                //...add item to list and prompt again...
                session.replaceDialog("addDinnerItem", { reprompt: true }); // Repeat dinner menu.
            }
        }
    }
]);

// Context Help dialog for party size
bot.dialog('partySizeHelp', function(session, args, next) {
    var msg = "Party size help: Our restaurant can support party sizes up to 150 members.";
    session.endDialog(msg);
})

bot.dialog('help', function (session, args, next) {
    session.endDialog("This is a demo that can help you make a dinner reservation or order a dinner. <br/>Please say 'next' to continue");
})
    .triggerAction({
        matches: /^help$/i,
        onSelectAction: (session, args, next) => {
            // Add the help dialog to the dialog stack
            // (override the default behavior of replacing the stack)
            // session.beginDialog(args.action, args);
        }
    });