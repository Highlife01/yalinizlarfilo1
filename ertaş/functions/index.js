const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

exports.updateExchangeRates = functions.pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    try {
      const response = await fetch('https://api.exchangerate.host/latest?base=TRY&symbols=EUR,USD');
      const data = await response.json();
      const goldPrice = 2800; // TL per gram, replace with real API if needed
      const rates = {
        euro: data.rates.EUR,
        dolar: data.rates.USD,
        altin: goldPrice,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await admin.firestore().collection('exchangeRates').doc('latest').set(rates);
      console.log('Exchange rates updated:', rates);
    } catch (e) {
      console.error('Failed to update exchange rates:', e);
    }
    return null;
  });
