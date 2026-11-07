import { compactCommunityLevel, validateCommunityLevel } from '../core/CommunityLevel.js';

const API_URL = import.meta.env.VITE_COMMUNITY_API_URL ||
  'https://little-level-lab-library.phanthanhbl88.workers.dev';

export class CommunityLibrary {
  constructor(editor) {
    this.editor = editor;
    this.dialog = document.createElement('dialog');
    this.dialog.className = 'level-dialog community-dialog';
    this.dialog.setAttribute('aria-labelledby', 'community-title');
    this.dialog.innerHTML = `
      <div class="level-dialog-form">
        <header class="level-dialog-header">
          <span class="eyebrow">COMMUNITY</span>
          <h2 id="community-title">Community levels</h2>
          <p>Discover levels and add them to your campaign. Public levels are not pre-screened.</p>
        </header>
        <p data-community-message role="status" aria-live="polite"></p>
        <div data-community-list class="community-list"></div>
        <button type="button" class="secondary-button" data-community-more hidden>Load more</button>
        <form data-community-share class="community-share">
          <h3>Share your current level</h3>
          <p>Anyone can see your level and nickname. Use a nickname, not personal information.</p>
          <label class="level-dialog-field">Level name
            <input name="title" maxlength="60" required autocomplete="off">
          </label>
          <label class="level-dialog-field">Builder nickname
            <input name="author" maxlength="40" required autocomplete="off">
          </label>
          <button type="submit" class="primary-button">Publish level</button>
        </form>
        <footer class="level-dialog-actions">
          <button type="button" class="secondary-button" data-community-close>Close</button>
        </footer>
      </div>`;
    document.body.appendChild(this.dialog);
    this.list = this.dialog.querySelector('[data-community-list]');
    this.message = this.dialog.querySelector('[data-community-message]');
    this.more = this.dialog.querySelector('[data-community-more]');
    this.form = this.dialog.querySelector('[data-community-share]');
    this.dialog.querySelector('[data-community-close]').addEventListener('click', () => this.dialog.close());
    this.more.addEventListener('click', () => this.loadPage(this.cursor));
    this.form.addEventListener('submit', event => {
      event.preventDefault();
      this.publish();
    });
    this.dialog.addEventListener('click', event => {
      const add = event.target.closest('[data-community-add]');
      if (add) this.addLevel(add.dataset.communityAdd, add);
      const share = event.target.closest('[data-community-copy]');
      if (share) this.copyLink(share.dataset.communityCopy);
    });
    editor.toolbar.querySelector('#community-library').addEventListener('click', () => this.open());
    const id = new URL(location.href).searchParams.get('community');
    if (id) this.open(id);
  }

  async request(path, options) {
    const result = await fetch(`${API_URL}${path}`, options);
    let data;
    try {
      data = await result.json();
    } catch {
      throw new Error('The library returned an invalid response.');
    }
    if (!result.ok) throw new Error(data.error || `Library request failed (${result.status}).`);
    return data;
  }

  open(id) {
    this.dialog.showModal();
    this.message.textContent = '';
    this.form.elements.title.value = this.editor.levels[this.editor.currentLevelIndex]?.name || '';
    this.list.replaceChildren();
    this.cardIds = new Set();
    this.cursor = null;
    this.more.hidden = true;
    this.more.textContent = 'Load more';
    if (id) this.loadSharedLevel(id);
    else this.loadPage();
  }

  showError(error) {
    console.error('Community library:', error);
    this.message.textContent = error.message || 'The community library could not be reached.';
  }

  makeCard(item) {
    this.cardIds.add(item.id);
    const card = document.createElement('article');
    card.className = 'community-card';
    const name = document.createElement('strong');
    name.textContent = item.title;
    const author = document.createElement('span');
    author.textContent = `By ${item.author}`;
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'primary-button';
    add.dataset.communityAdd = item.id;
    add.textContent = 'Add to campaign';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'secondary-button';
    copy.dataset.communityCopy = item.id;
    copy.textContent = 'Copy link';
    card.append(name, author, add, copy);
    return card;
  }

  async loadPage(cursor) {
    this.message.textContent = 'Loading community levels…';
    this.more.disabled = true;
    try {
      const data = await this.request(`/levels${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`);
      for (const item of data.levels) {
        if (!this.cardIds.has(item.id)) this.list.append(this.makeCard(item));
      }
      this.cursor = data.next;
      this.more.hidden = !this.cursor;
      this.more.textContent = 'Load more';
      this.message.textContent = this.list.children.length ? '' : 'No shared levels yet.';
    } catch (error) {
      this.showError(error);
    } finally {
      this.more.disabled = false;
    }
  }

  async loadSharedLevel(id) {
    this.message.textContent = 'Loading shared level…';
    try {
      const data = await this.request(`/levels/${encodeURIComponent(id)}`);
      validateCommunityLevel(data.level);
      this.list.append(this.makeCard(data));
      this.message.textContent = 'Shared level';
      this.more.hidden = false;
      this.more.textContent = 'Browse all levels';
    } catch (error) {
      this.showError(error);
      this.more.hidden = false;
      this.more.textContent = 'Browse all levels';
    }
  }

  async addLevel(id, button) {
    if (this.editor.levels.length >= 50) {
      this.message.textContent = 'Your campaign already has 50 levels.';
      return;
    }
    button.disabled = true;
    try {
      const data = await this.request(`/levels/${encodeURIComponent(id)}`);
      validateCommunityLevel(data.level);
      this.editor.stateManager.validateWorld(data.level);
      this.editor.saveCurrentLevel();
      const index = this.editor.currentLevelIndex + 1;
      this.editor.levels.splice(index, 0, { name: data.title, hint: '', snapshot: data.level });
      this.editor.currentLevelIndex = index;
      this.editor.applyLevelSnapshot(data.level);
      this.dialog.close();
      this.editor.setStatus(`Added "${data.title}" by ${data.author} to your campaign.`);
    } catch (error) {
      this.showError(error);
    } finally {
      button.disabled = false;
    }
  }

  async publish() {
    const title = this.form.elements.title.value.trim();
    const author = this.form.elements.author.value.trim();
    if (!title || !author) {
      this.message.textContent = 'Enter a level name and a builder nickname.';
      return;
    }
    let level;
    try {
      const compact = compactCommunityLevel(this.editor.stateManager.getWorldSnapshot());
      level = compact.level;
      if (compact.customAssets && !window.confirm(
        'The shared copy will replace custom images, creatures, bosses and sounds with built-in alternatives. Your original level will not change. Publish the shared copy?'
      )) return;
    } catch (error) {
      this.showError(error);
      return;
    }
    const submit = this.form.querySelector('button[type="submit"]');
    submit.disabled = true;
    this.message.textContent = 'Publishing…';
    try {
      const result = await this.request('/levels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author, level })
      });
      if (!this.cardIds.has(result.id)) this.list.prepend(this.makeCard({ id: result.id, title, author }));
      this.message.textContent = 'Published! Use Copy link to share your level.';
    } catch (error) {
      this.showError(error);
    } finally {
      submit.disabled = false;
    }
  }

  async copyLink(id) {
    const url = new URL(location.href);
    url.searchParams.set('community', id);
    try {
      await navigator.clipboard.writeText(url.href);
      this.message.textContent = 'Link copied!';
    } catch (error) {
      console.error('Could not copy the community level link:', error);
      this.message.textContent = `Could not copy automatically. Share this link: ${url.href}`;
    }
  }
}
