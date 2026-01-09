// Module Federation type declarations for remote MFEs
// Using unique aliases to prevent Zephyr from auto-overriding URLs

declare module "pretrip_main/App" {
  const App: React.ComponentType;
  export default App;
}

declare module "itinerary_main/App" {
  const App: React.ComponentType;
  export default App;
}

declare module "duringtrip_main/App" {
  const App: React.ComponentType;
  export default App;
}




