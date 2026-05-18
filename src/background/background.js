const extensionApi = globalThis.browser || globalThis.chrome;

if (extensionApi?.sidePanel?.setPanelBehavior) {
  Promise.resolve(extensionApi.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }))
    .catch((error) => console.error(error));
}

if (extensionApi?.action?.onClicked && extensionApi?.sidebarAction?.open) {
  extensionApi.action.onClicked.addListener(() => {
    Promise.resolve(extensionApi.sidebarAction.open())
      .catch((error) => console.error(error));
  });
}
