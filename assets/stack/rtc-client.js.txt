export async function createRoom(request, memberIds = []) {
  const result = await request('/api/rtc/rooms', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ memberIds }),
  });
  if (!result.ok) throw Error('Room creation failed');
  return (await result.json()).roomId;
}
export async function joinToken(request, roomId) {
  const response = await request('/api/rtc/rooms/' + encodeURIComponent(roomId) + '/join', {
    method: 'POST',
  });
  if (!response.ok) throw Error('Room unavailable');
  return (await response.json()).token;
}
