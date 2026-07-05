try {
  var theme = localStorage.getItem("theme");
  if (theme === "system" || !theme) {
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }
  document.documentElement.classList.add(theme);
} catch (e) {}
