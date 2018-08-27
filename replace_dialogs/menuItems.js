const menus = {
    consoleMenu: {
        "Order dinner": {
            item: "orderDinner"
        },
        "Dinner reservation": {
            item: "dinnerReservation"
        },
        "Schedule shuttle": {
            item: "scheduleShuttle"
        },
        "Request wake-up call": {
            item: "wakeupCall"
        }
    },
    dinnerMenu: {
        "Potato Salad - $5": {
            Description: "Potato Salad",
            Price: 5
        },
        "Tuna Sandwich - $6": {
            Description: "Tuna Sandwich",
            Price: 6
        },
        "Clam Chowder - $4":{
            Description: "Clam Chowder",
            Price: 4
        },
        "Check out": {
            Description: "Check out",
            Price: 0      // Order total. Updated as items are added to order.
        },
        "Cancel order": { // Cancel the order and back to Main Menu
            Description: "Cancel order",
            Price: 0
        }
    }
}
module.exports = menus;