(() => {
  const candidates = [
    ...document.querySelectorAll('article,[itemprop="articleBody"],[role="main"],main,.article-content,.post-content,.entry-content,.content-body'),
    document.body
  ];
  const unwanted = 'nav,header,footer,aside,script,style,noscript,form,button,svg,figure,figcaption,[role="navigation"],[aria-hidden="true"],.sidebar,.related,.comments,.advertisement,.newsletter';
  function getText(root) {
    const clone = root.cloneNode(true);
    clone.querySelectorAll(unwanted).forEach(el => el.remove());
    const blocks = [...clone.querySelectorAll('h1,h2,h3,h4,p,li,blockquote')]
      .map(el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(text => text.length >= 25);
    let text = blocks.join('\n\n');
    if (text.length < 200) text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    return text;
  }
  const ranked = candidates.map(root => ({ root, text: getText(root) }))
    .sort((a, b) => {
      const score = x => Math.min(x.text.length, 30000) - (x.root === document.body ? 1500 : 0);
      return score(b) - score(a);
    });
  const best = ranked[0];
  const title = document.querySelector('article h1,main h1,h1')?.textContent?.replace(/\s+/g, ' ').trim()
    || document.querySelector('meta[property="og:title"]')?.content
    || document.title || 'Untitled article';
  const text = best?.text?.slice(0, 30000) || '';
  return { title: title.slice(0, 250), url: location.href, domain: location.hostname, text, wordCount: text.split(/\s+/).length };
})()
