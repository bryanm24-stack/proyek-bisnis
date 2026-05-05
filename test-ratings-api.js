// Test script to verify ratings API is working
const fs = require('fs');
const path = require('path');

const testServiceId = '1704067202000';

async function testAPI() {
  try {
    const ratingsPath = path.join(process.cwd(), 'ratings.json');
    const usersPath = path.join(process.cwd(), 'users.json');

    const ratingsData = fs.readFileSync(ratingsPath, 'utf-8').trim();
    const ratings = JSON.parse(ratingsData);

    const usersData = fs.readFileSync(usersPath, 'utf-8').trim();
    const users = JSON.parse(usersData);

    console.log('All ratings:', ratings.length);
    console.log('---');

    const serviceRatings = ratings
      .filter(r => r.serviceId === testServiceId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((ratingItem) => {
        const customer = users.find((u) => u.id === ratingItem.customerId);
        return {
          ...ratingItem,
          customerName: customer?.name || 'Customer'
        };
      });

    console.log(`Ratings for serviceId ${testServiceId}:`, serviceRatings.length);
    console.log(JSON.stringify(serviceRatings, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
