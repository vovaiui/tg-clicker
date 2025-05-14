// Initialize Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Sample data - in a real app, you would fetch this from an API
const cryptoData = {
    rates: {
        BTC: { USDT: 50000, ETH: 15, BNB: 100, SOL: 2000 },
        ETH: { USDT: 3300, BTC: 0.066, BNB: 6.6, SOL: 133 },
        BNB: { USDT: 500, BTC: 0.01, ETH: 0.15, SOL: 20 },
        SOL: { USDT: 25, BTC: 0.0005, ETH: 0.0075, BNB: 0.05 },
        USDT: { BTC: 0.00002, ETH: 0.0003, BNB: 0.002, SOL: 0.04 }
    },
    assets: [
        { symbol: 'BTC', name: 'Bitcoin', balance: 0.05, value: 2500, change: 2.5 },
        { symbol: 'ETH', name: 'Ethereum', balance: 1.2, value: 3960, change: -1.2 },
        { symbol: 'BNB', name: 'Binance Coin', balance: 5, value: 2500, change: 0.8 },
        { symbol: 'SOL', name: 'Solana', balance: 50, value: 1250, change: 5.3 },
        { symbol: 'USDT', name: 'Tether', balance: 1000, value: 1000, change: 0 }
    ],
    transactions: [
        { id: 1, type: 'Exchange', amount: '+500 USDT', fromAmount: '0.01 BTC', date: '2023-05-15 14:30', status: 'completed' },
        { id: 2, type: 'Deposit', amount: '+0.05 BTC', date: '2023-05-14 09:15', status: 'completed' },
        { id: 3, type: 'Withdrawal', amount: '-1 ETH', date: '2023-05-12 18:45', status: 'completed' },
        { id: 4, type: 'Exchange', amount: '+20 SOL', fromAmount: '0.5 BNB', date: '2023-05-10 11:20', status: 'completed' },
        { id: 5, type: 'Deposit', amount: '+1000 USDT', date: '2023-05-08 16:00', status: 'pending' }
    ]
};

// DOM elements
const exchangeTab = document.getElementById('exchangeTab');
const walletTab = document.getElementById('walletTab');
const historyTab = document.getElementById('historyTab');
const exchangeContent = document.getElementById('exchangeContent');
const walletContent = document.getElementById('walletContent');
const historyContent = document.getElementById('historyContent');
const sendCurrencyDropdown = document.getElementById('sendCurrencyDropdown');
const receiveCurrencyDropdown = document.getElementById('receiveCurrencyDropdown');
const sendCurrencyList = document.getElementById('sendCurrencyList');
const receiveCurrencyList = document.getElementById('receiveCurrencyList');
const sendAmount = document.getElementById('sendAmount');
const receiveAmount = document.getElementById('receiveAmount');
const sendBalance = document.getElementById('sendBalance');
const receiveBalance = document.getElementById('receiveBalance');
const sendMax = document.getElementById('sendMax');
const exchangeRate = document.getElementById('exchangeRate');
const exchangeFee = document.getElementById('exchangeFee');
const exchangeBtn = document.getElementById('exchangeBtn');
const switchCurrencies = document.getElementById('switchCurrencies');
const assetsList = document.getElementById('assetsList');
const transactionsList = document.getElementById('transactionsList');
const totalBalance = document.getElementById('totalBalance');
const availableBalance = document.getElementById('availableBalance');

// State
let currentSendCurrency = 'BTC';
let currentReceiveCurrency = 'USDT';
let currentTab = 'exchange';

// Initialize the app
function init() {
    setupEventListeners();
    renderCurrenciesDropdown();
    renderAssetsList();
    renderTransactions();
    updateExchangeValues();
    updateBalances();
}

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    exchangeTab.addEventListener('click', () => switchTab('exchange'));
    walletTab.addEventListener('click', () => switchTab('wallet'));
    historyTab.addEventListener('click', () => switchTab('history'));
    
    // Exchange functionality
    sendAmount.addEventListener('input', updateReceiveAmount);
    sendMax.addEventListener('click', setMaxAmount);
    switchCurrencies.addEventListener('click', switchCurrencyPair);
    exchangeBtn.addEventListener('click', performExchange);
    
    // Handle back button in Telegram
    tg.BackButton.onClick(() => {
        if (currentTab !== 'exchange') {
            switchTab('exchange');
        } else {
            tg.close();
        }
    });
}

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    exchangeTab.classList.remove('active');
    walletTab.classList.remove('active');
    historyTab.classList.remove('active');
    
    // Hide all content
    exchangeContent.classList.add('d-none');
    walletContent.classList.add('d-none');
    historyContent.classList.add('d-none');
    
    // Show selected content
    if (tab === 'exchange') {
        exchangeTab.classList.add('active');
        exchangeContent.classList.remove('d-none');
        tg.BackButton.hide();
    } else if (tab === 'wallet') {
        walletTab.classList.add('active');
        walletContent.classList.remove('d-none');
        tg.BackButton.show();
    } else if (tab === 'history') {
        historyTab.classList.add('active');
        historyContent.classList.remove('d-none');
        tg.BackButton.show();
    }
}

// Render currencies dropdown
function renderCurrenciesDropdown() {
    sendCurrencyList.innerHTML = '';
    receiveCurrencyList.innerHTML = '';
    
    const currencies = Object.keys(cryptoData.rates);
    
    currencies.forEach(currency => {
        // Send currency list
        const sendItem = document.createElement('li');
        const sendLink = document.createElement('a');
        sendLink.classList.add('dropdown-item');
        sendLink.href = '#';
        sendLink.textContent = currency;
        sendLink.addEventListener('click', (e) => {
            e.preventDefault();
            currentSendCurrency = currency;
            sendCurrencyDropdown.textContent = currency;
            updateExchangeValues();
            updateSendBalance();
        });
        sendItem.appendChild(sendLink);
        sendCurrencyList.appendChild(sendItem);
        
        // Receive currency list
        const receiveItem = document.createElement('li');
        const receiveLink = document.createElement('a');
        receiveLink.classList.add('dropdown-item');
        receiveLink.href = '#';
        receiveLink.textContent = currency;
        receiveLink.addEventListener('click', (e) => {
            e.preventDefault();
            currentReceiveCurrency = currency;
            receiveCurrencyDropdown.textContent = currency;
            updateExchangeValues();
            updateReceiveBalance();
        });
        receiveItem.appendChild(receiveLink);
        receiveCurrencyList.appendChild(receiveItem);
    });
}

// Update exchange values when inputs change
function updateExchangeValues() {
    const rate = cryptoData.rates[currentSendCurrency][currentReceiveCurrency];
    exchangeRate.textContent = `1 ${currentSendCurrency} = ${rate} ${currentReceiveCurrency}`;
    
    if (sendAmount.value) {
        updateReceiveAmount();
    }
}

// Update receive amount based on send amount
function updateReceiveAmount() {
    const amount = parseFloat(sendAmount.value) || 0;
    const rate = cryptoData.rates[currentSendCurrency][currentReceiveCurrency];
    const fee = amount * rate * 0.01; // 1% fee
    
    const receiveValue = (amount * rate) - fee;
    receiveAmount.value = receiveValue.toFixed(8);
    
    exchangeFee.textContent = `${fee.toFixed(8)} ${currentReceiveCurrency}`;
}

// Set max amount to send
function setMaxAmount() {
    const asset = cryptoData.assets.find(a => a.symbol === currentSendCurrency);
    if (asset) {
        sendAmount.value = asset.balance;
        updateReceiveAmount();
    }
}

// Switch send and receive currencies
function switchCurrencyPair() {
    const temp = currentSendCurrency;
    currentSendCurrency = currentReceiveCurrency;
    currentReceiveCurrency = temp;
    
    sendCurrencyDropdown.textContent = currentSendCurrency;
    receiveCurrencyDropdown.textContent = currentReceiveCurrency;
    
    // Swap amounts
    const tempAmount = sendAmount.value;
    sendAmount.value = receiveAmount.value;
    receiveAmount.value = tempAmount;
    
    updateExchangeValues();
    updateBalances();
}

// Perform exchange (simulated)
function performExchange() {
    const amount = parseFloat(sendAmount.value);
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    const sendAsset = cryptoData.assets.find(a => a.symbol === currentSendCurrency);
    const receiveAsset = cryptoData.assets.find(a => a.symbol === currentReceiveCurrency);
    
    if (sendAsset.balance < amount) {
        alert('Insufficient balance');
        return;
    }
    
    // In a real app, you would call an API here
    const rate = cryptoData.rates[currentSendCurrency][currentReceiveCurrency];
    const fee = amount * rate * 0.01;
    const receivedAmount = (amount * rate) - fee;
    
    // Update balances (simulated)
    sendAsset.balance -= amount;
    receiveAsset.balance += receivedAmount;
    
    // Add transaction to history
    const newTransaction = {
        id: cryptoData.transactions.length + 1,
        type: 'Exchange',
        amount: `+${receivedAmount.toFixed(4)} ${currentReceiveCurrency}`,
        fromAmount: `-${amount.toFixed(8)} ${currentSendCurrency}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'completed'
    };
    
    cryptoData.transactions.unshift(newTransaction);
    
    // Reset form
    sendAmount.value = '';
    receiveAmount.value = '';
    
    // Update UI
    updateBalances();
    renderTransactions();
    
    // Show success message
    alert(`Successfully exchanged ${amount} ${currentSendCurrency} to ${receivedAmount.toFixed(4)} ${currentReceiveCurrency}`);
}

// Render assets list
function renderAssetsList() {
    assetsList.innerHTML = '';
    
    cryptoData.assets.forEach(asset => {
        const assetItem = document.createElement('div');
        assetItem.classList.add('asset-item');
        
        assetItem.innerHTML = `
            <img src="https://cryptoicon-api.vercel.app/api/icon/${asset.symbol.toLowerCase()}" alt="${asset.symbol}" class="asset-icon">
            <div class="asset-details">
                <div class="asset-name">${asset.name}</div>
                <div class="asset-amount">${asset.balance} ${asset.symbol}</div>
            </div>
            <div class="asset-value">
                <div class="asset-price">$${asset.value.toFixed(2)}</div>
                <div class="asset-change ${asset.change < 0 ? 'negative' : ''}">${asset.change > 0 ? '+' : ''}${asset.change}%</div>
            </div>
        `;
        
        assetItem.addEventListener('click', () => {
            // In a real app, you would navigate to asset details
            alert(`Showing details for ${asset.symbol}`);
        });
        
        assetsList.appendChild(assetItem);
    });
}

// Render transactions
function renderTransactions() {
    transactionsList.innerHTML = '';
    
    cryptoData.transactions.forEach(tx => {
        const txItem = document.createElement('div');
        txItem.classList.add('transaction-item');
        
        const statusClass = `status-${tx.status}`;
        
        txItem.innerHTML = `
            <div class="transaction-header">
                <span class="transaction-type">${tx.type}</span>
                <span class="transaction-amount">${tx.amount}</span>
            </div>
            ${tx.fromAmount ? `<div class="transaction-from">${tx.fromAmount}</div>` : ''}
            <div class="d-flex justify-content-between">
                <span class="transaction-date">${tx.date}</span>
                <span class="transaction-status ${statusClass}">${tx.status}</span>
            </div>
        `;
        
        transactionsList.appendChild(txItem);
    });
}

// Update balances
function updateBalances() {
    // Update total and available balances
    const total = cryptoData.assets.reduce((sum, asset) => {
        return sum + asset.value;
    }, 0);
    
    totalBalance.textContent = `$${total.toFixed(2)}`;
    availableBalance.textContent = `$${total.toFixed(2)}`;
    
    // Update send and receive balances
    updateSendBalance();
    updateReceiveBalance();
}

// Update send balance display
function updateSendBalance() {
    const asset = cryptoData.assets.find(a => a.symbol === currentSendCurrency);
    if (asset) {
        sendBalance.textContent = `${asset.balance} ${currentSendCurrency}`;
    }
}

// Update receive balance display
function updateReceiveBalance() {
    const asset = cryptoData.assets.find(a => a.symbol === currentReceiveCurrency);
    if (asset) {
        receiveBalance.textContent = `${asset.balance} ${currentReceiveCurrency}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
