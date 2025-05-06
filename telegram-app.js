window.TelegramWebApp = {
    init: function() {
        if (window.Telegram && window.Telegram.WebApp) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            return true;
        }
        return false;
    }
};
