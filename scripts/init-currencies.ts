import { db } from "../server/db";
import { currencies, exchangeRates } from "@shared/schema";
import { SUPPORTED_CURRENCIES } from "@shared/schema";

async function initCurrencies() {
  console.log("Initializing currencies...");

  // Create currencies
  const createdCurrencies = [];
  for (const currencyData of SUPPORTED_CURRENCIES) {
    console.log(`Creating currency: ${currencyData.code}`);
    
    const [currency] = await db
      .insert(currencies)
      .values({
        code: currencyData.code,
        name: currencyData.name,
        symbol: currencyData.symbol,
        isBaseCurrency: currencyData.isBaseCurrency,
        isActive: true,
        sortOrder: currencyData.sortOrder,
      })
      .returning();
    
    createdCurrencies.push(currency);
    console.log(`Created currency: ${currency.code} (${currency.id})`);
  }

  // Set up basic exchange rates (simplified rates for demonstration)
  console.log("Setting up exchange rates...");
  
  const usd = createdCurrencies.find(c => c.code === 'USD');
  const amd = createdCurrencies.find(c => c.code === 'AMD');
  const rub = createdCurrencies.find(c => c.code === 'RUB');

  if (!usd || !amd || !rub) {
    throw new Error("Could not find all created currencies");
  }

  const exchangeRatesData = [
    // USD to AMD (1 USD = 390 AMD)
    { fromCurrencyId: usd.id, toCurrencyId: amd.id, rate: "390.00000000", source: "manual", isManual: true },
    // AMD to USD (1 AMD = 0.00256 USD)
    { fromCurrencyId: amd.id, toCurrencyId: usd.id, rate: "0.00256410", source: "manual", isManual: true },
    
    // USD to RUB (1 USD = 92 RUB)
    { fromCurrencyId: usd.id, toCurrencyId: rub.id, rate: "92.00000000", source: "manual", isManual: true },
    // RUB to USD (1 RUB = 0.01087 USD)
    { fromCurrencyId: rub.id, toCurrencyId: usd.id, rate: "0.01086957", source: "manual", isManual: true },
    
    // AMD to RUB (1 AMD = 0.236 RUB)
    { fromCurrencyId: amd.id, toCurrencyId: rub.id, rate: "0.23589744", source: "manual", isManual: true },
    // RUB to AMD (1 RUB = 4.24 AMD)
    { fromCurrencyId: rub.id, toCurrencyId: amd.id, rate: "4.23913043", source: "manual", isManual: true },
  ];

  for (const rateData of exchangeRatesData) {
    const [rate] = await db
      .insert(exchangeRates)
      .values(rateData)
      .returning();
    
    console.log(`Created exchange rate: ${rate.id} (${rateData.rate})`);
  }

  console.log("Currencies and exchange rates initialized successfully!");
}

// Run initialization
initCurrencies()
  .then(() => {
    console.log("Initialization complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Initialization failed:", error);
    process.exit(1);
  });