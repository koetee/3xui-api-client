import { createClient } from './src/index';

const config = {
    baseUrl: 'https://example.com:12802/example/',
    username: 'example',
    password: 'example',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
};

async function demo() {
    console.log('Quick Demo: Subscription Management\n');

    const xui = createClient(config);

    try {
        await xui.login();
        console.log('Logged in successfully\n');

        console.log('Current subscriptions:');
        const subscriptions = await xui.clients.getAllSubscriptions();

        if (subscriptions.length === 0) {
            console.log('   No subscriptions found\n');
        } else {
            subscriptions.forEach((sub, index) => {
                console.log(`   ${index + 1}. SubId: ${sub.subId} (${sub.clients.length} clients)`);
                sub.clients.forEach(clientInfo => {
                    console.log(`      - ${clientInfo.client.email} on ${clientInfo.inboundRemark} (${clientInfo.inboundProtocol})`);
                });
            });
            console.log();
        }

        console.log('\nDemo completed successfully!');

    } catch (error) {
        console.error('\nDemo failed:', error);

        if (error instanceof Error) {
            console.error('Details:', error.message);
        }
    } finally {
        xui.logout();
        console.log('Logged out');
    }
}

if (require.main === module) {
    demo().catch(console.error);
}

export { demo }; 