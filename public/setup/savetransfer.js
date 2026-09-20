const save_transfer_backend_config = {
  endpoint: `${window.location.origin}/keys`,
  createPath: "/api/codes",
  resolvePath: "/api/codes/{code}",
  timeoutMs: 3500,
};

window.save_transfer_backend_config = save_transfer_backend_config;
window.saveTransferBackendConfig = save_transfer_backend_config;
