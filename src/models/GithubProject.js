class GithubProject {
    constructor(name, description, url, language, stars, id = null) {
        this.id = id || Date.now() + Math.random(); // Auto-generate if not provided
        this.name = name;
        this.description = description;
        this.url = url;
        this.language = language;
        this.stars = stars;
    }
}

module.exports = GithubProject;
