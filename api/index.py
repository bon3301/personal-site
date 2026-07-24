import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)

SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
CURRENTLY_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing"
RECENTLY_PLAYED_URL = "https://api.spotify.com/v1/me/player/recently-played"


def get_access_token():
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    refresh_token = os.getenv("SPOTIFY_REFRESH_TOKEN")

    if not client_id or not client_secret or not refresh_token:
        raise RuntimeError("Spotify environment variables are missing")

    response = requests.post(
        SPOTIFY_TOKEN_URL,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        },
        auth=(client_id, client_secret),
        timeout=10
    )

    response.raise_for_status()
    return response.json()["access_token"]


@app.get("/api/current-song")
def current_song():
    try:
        token = get_access_token()
        headers = {"Authorization": f"Bearer {token}"}

        response = requests.get(
            CURRENTLY_PLAYING_URL,
            headers=headers,
            timeout=10
        )

        item = None
        is_playing = False

        if response.status_code == 200 and response.text:
            data = response.json()
            item = data.get("item")
            is_playing = data.get("is_playing", False)
        elif response.status_code != 204:
            response.raise_for_status()

        if not item:
            response = requests.get(
                RECENTLY_PLAYED_URL,
                headers=headers,
                params={"limit": 1},
                timeout=10
            )

            response.raise_for_status()
            items = response.json().get("items", [])

            if items:
                item = items[0]["track"]

        if not item:
            return jsonify({"error": "No track data available"}), 404

        album_images = item["album"].get("images", [])

        return jsonify({
            "is_playing": is_playing,
            "song": item["name"],
            "artist": ", ".join(
                artist["name"] for artist in item["artists"]
            ),
            "album": item["album"]["name"],
            "album_image": album_images[0]["url"] if album_images else None,
            "spotify_url": item["external_urls"]["spotify"],
            "uri": item["uri"]
        })

    except (requests.RequestException, RuntimeError, KeyError) as error:
        return jsonify({"error": str(error)}), 500


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})
