import { chromium } from 'playwright';

async function main() {
  console.log('Connecting to Chrome...');
  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = browser.contexts()[0].pages().find(p => p.url().includes('localhost:3000/map'));
    
    if (!page) {
      console.log('Map page not found.');
      await browser.close();
      return;
    }

    console.log('Map page found. Reloading and capturing console errors with stack traces...');
    
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        console.log(`\n[Browser Error Message] ${msg.text()}`);
        
        // Inspect the arguments to get the stack trace
        const args = msg.args();
        for (let i = 0; i < args.length; i++) {
          const arg = args[i];
          const type = arg.jsonValue().then(val => typeof val).catch(() => 'unknown');
          
          try {
            const stack = await arg.evaluate((obj) => {
              if (obj instanceof Error) {
                return obj.stack;
              }
              // If it's an object that has a stack property
              if (obj && typeof obj === 'object' && 'stack' in obj) {
                return (obj as any).stack;
              }
              // Try to JSON stringify
              try {
                return 'Object: ' + JSON.stringify(obj);
              } catch (e) {
                return String(obj);
              }
            });
            if (stack) {
              console.log(`[Argument ${i} Stack/Value]:\n${stack}`);
            }
          } catch (e: any) {
            console.log(`[Argument ${i} evaluation failed]: ${e.message}`);
          }
        }
      } else {
        console.log(`[Console Log] ${msg.text()}`);
      }
    });

    await page.reload({ waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 6000));
    
    await browser.close();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
