import { nextTick } from 'vue'

// Print once the bill (and its logo) is in the DOM: a bill mounted just before printing
// would otherwise reach the print dialog before its images have loaded.
export async function printBill(timeout = 3000) {
  await nextTick()
  const imgs = [...document.querySelectorAll('body > .bill img')].filter((i) => !i.complete)
  await Promise.race([
    Promise.all(imgs.map((i) => new Promise((done) => { i.onload = i.onerror = done }))),
    new Promise((done) => setTimeout(done, timeout)), // a slow or broken logo shouldn't block printing
  ])
  window.print()
}
