const axios = require('axios');
const url = 'https://graph.facebook.com/v22.0/967962443074961/messages';
const token = 'EAAUzZADOWb98BQxlZBmoStDiCjfwEN8BjS8tQWty3NNdMZCxy8ls8O7pYpjTVZAikZANKSHh7lF9W9BCdFeUzCpvItZCKMbwCSxVKTVwcYu03z8riVGlSGFZCx8DsZCu8mb7CXffOfUkBXWukbyUsiJvBcLsXHOHBffojLZAZBSiwJT8UUI6ANZCmEsgrdkYqP7QllcZAfNFr5mbDGaxlf1NYpuhC354z7HZB2ZBQT9zT6ojiXrLf0Dff1F6lVIZB6OZC2jnloJWzfZCyKp3YUMAd6xQPFFBMYJsY6AZDZD';

axios.post(url, {
    messaging_product: 'whatsapp',
    to: '917893641009',
    type: 'template',
    template: { name: 'hello_world', language: { code: 'en_US' } }
}, {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
}).then(r => console.log('SUCCESS:', r.data))
    .catch(e => {
        console.log('STATUS:', e.response?.status);
        console.log('DATA:', JSON.stringify(e.response?.data, null, 2));
    });
