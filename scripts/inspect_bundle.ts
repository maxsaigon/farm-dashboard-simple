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

    console.log('Map page found. Evaluating functions...');
    
    // Evaluate the functions on the page. Since they are inside a React component,
    // they are not globally accessible. But we can inspect the bundle or inspect the
    // network tab/react components or see if they are in the build.
    // Wait, since they are inside the MapPageContent component, we cannot just call
    // window.loadTrees.
    // Let's see if we can read the page source script bundle!
    // Or we can search all script tags for text.
    const scripts = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll('script'));
      return scriptTags
        .map(s => s.src)
        .filter(src => src.includes('/_next/static/'));
    });

    console.log('Script sources:', scripts);

    // Let's check if we can inspect the react components or force next dev server client info
    const buildInfo = await page.evaluate(() => {
      return (window as any).__NEXT_DATA__ || 'no next data';
    });
    console.log('Next.js build/page info:', JSON.stringify(buildInfo, null, 2));

    await browser.close();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

main();
