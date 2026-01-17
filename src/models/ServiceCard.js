class ServiceCard {
    constructor(title, url, description, icon, isPrivate = false, id = null) {
        this.id = id || Date.now() + Math.random(); // Auto-generate if not provided
        this.title = title;
        this.url = url;
        this.description = description;
        this.icon = icon; // Could be a font-awesome class or image path
        this.isPrivate = isPrivate; // If true, only visible to admin
    }
}

module.exports = ServiceCard;
