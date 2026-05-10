export class PlayerManager {
    constructor(socket) {
        this.socket = socket;
        this.self = null;
        
        this.socket.on('registration_success', (player) => {
            this.self = player;
            window.dispatchEvent(new CustomEvent('player_data_updated'));
        });

        this.socket.on('player_data_updated', (player) => {
            this.self = player;
            window.dispatchEvent(new CustomEvent('player_data_updated'));
        });

        this.socket.on('profile_updated', (data) => {
            if (this.self) {
                this.self.ownedFrames = data.ownedFrames;
                this.self.currentFrame = data.currentFrame;
                window.dispatchEvent(new CustomEvent('player_data_updated'));
            }
        });
    }

    getSelf() {
        return this.self;
    }
}
