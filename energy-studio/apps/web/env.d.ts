/// <reference types="vite/client" />
/// <reference types="@adamstavely/trenchcoat/vue" />
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
