import { mount } from "svelte";

import App from "./App.svelte";

const target = document.querySelector("#app");

if (!target) {
  throw new Error("Application root was not found");
}

mount(App, {
  target,
});
