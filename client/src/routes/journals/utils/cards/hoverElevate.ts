export function applyHoverElevate(el: HTMLElement, elevated = true) {
  if (elevated) {
    el.style.transform = "translateY(-6px)";
    el.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
  } else {
    el.style.transform = "translateY(0)";
    el.style.boxShadow = "";
  }
}

export default applyHoverElevate;
