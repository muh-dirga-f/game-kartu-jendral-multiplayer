export function pulse(el) {
  el.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 300 });
}
