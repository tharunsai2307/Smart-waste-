const http = require('http');

function postJSON(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': '1', // Admin userId
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

async function run() {
  try {
    console.log('Seeding Transport Facility...');
    const facRes = await postJSON('/api/facilities', {
      facilityCode: 'FAC-001',
      name: 'EcoRecycle Processing Plant',
      facilityType: 'RECYCLING_HUB',
      address: 'Industrial Zone Block B, Clean City',
      contactName: 'Jane Smith',
      contactPhone: '9876543210',
      latitude: 12.9816,
      longitude: 77.6046
    });
    console.log('Facility Res:', facRes);

    console.log('Seeding Vehicle...');
    const vehRes = await postJSON('/api/vehicles', {
      registrationNumber: 'DL-01-AB-1234',
      vehicleCode: 'VEH-002',
      vehicleType: 'TRUCK',
      make: 'Tata',
      model: 'Prima',
      manufactureYear: 2024,
      capacityKg: 5000,
      assignedHubId: 1,
      insuranceExpiry: '2028-12-31',
      inspectionExpiry: '2028-12-31',
      lastServiceDate: '2026-01-01'
    });
    console.log('Vehicle Res:', vehRes);

  } catch (err) {
    console.error('Error seeding:', err);
  }
}

run();
