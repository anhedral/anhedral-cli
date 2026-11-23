export function file(request, name, options) {
  return request('/api/files/' + encodeURIComponent(name), options);
}
export const uploadFile = (request, name, body) => file(request, name, { method: 'PUT', body });
export const deleteFile = (request, name) => file(request, name, { method: 'DELETE' });
