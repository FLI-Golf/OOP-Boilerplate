<script lang="ts">
	import { createAuthState } from '$lib/stores/auth.store';
	import { onMount } from 'svelte';

	const auth = createAuthState();

	// Auth modal state
	let showAuthModal = $state(false);
	let authMode = $state<'login' | 'register'>('login');
	let email = $state('');
	let password = $state('');
	let passwordConfirm = $state('');
	let displayName = $state('');
	let formError = $state('');
	let formLoading = $state(false);

	onMount(() => {
		auth.init();
	});

	function openLogin() {
		authMode = 'login';
		showAuthModal = true;
		clearForm();
	}

	function openRegister() {
		authMode = 'register';
		showAuthModal = true;
		clearForm();
	}

	function closeModal() {
		showAuthModal = false;
		clearForm();
	}

	function clearForm() {
		email = '';
		password = '';
		passwordConfirm = '';
		displayName = '';
		formError = '';
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		formError = '';
		formLoading = true;

		try {
			if (authMode === 'login') {
				await auth.login(email, password);
			} else {
				await auth.register(email, password, passwordConfirm, displayName);
			}
			closeModal();
		} catch (err) {
			formError = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			formLoading = false;
		}
	}

	const features = [
		{
			title: 'Create Your League',
			description: 'Purchase a fantasy league and become the owner. Set entry fees and invite friends.',
			icon: '🏆'
		},
		{
			title: 'Live Scoring',
			description: 'Watch your points accumulate as real tournaments unfold throughout the season.',
			icon: '⛳'
		},
		{
			title: 'Win Prizes',
			description: 'Compete for the prize pool. Multiple payout structures available.',
			icon: '💰'
		}
	];

	const workflow = [
		{ step: 1, title: 'Owner Creates League', status: 'pending_players' },
		{ step: 2, title: 'Players Request to Join', status: 'pending_players' },
		{ step: 3, title: 'Owner Approves Players', status: 'pending_players' },
		{ step: 4, title: 'League Fills (6/6)', status: 'ready' },
		{ step: 5, title: 'Draft Your Team', status: 'drafting' },
		{ step: 6, title: 'Season Begins', status: 'active' }
	];
</script>

<!-- Auth Modal -->
{#if showAuthModal}
	<div class="modal-overlay" onclick={closeModal} onkeydown={(e) => e.key === 'Escape' && closeModal()} role="button" tabindex="0">
		<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="dialog" aria-modal="true">
			<button class="modal-close" onclick={closeModal}>&times;</button>
			<h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
			
			<form onsubmit={handleSubmit}>
				{#if authMode === 'register'}
					<div class="form-field">
						<label for="displayName">Display Name</label>
						<input 
							id="displayName" 
							type="text" 
							bind:value={displayName} 
							placeholder="Your name"
							required 
						/>
					</div>
				{/if}

				<div class="form-field">
					<label for="email">Email</label>
					<input 
						id="email" 
						type="email" 
						bind:value={email} 
						placeholder="you@example.com"
						required 
					/>
				</div>

				<div class="form-field">
					<label for="password">Password</label>
					<input 
						id="password" 
						type="password" 
						bind:value={password} 
						placeholder="••••••••"
						required 
						minlength="8"
					/>
				</div>

				{#if authMode === 'register'}
					<div class="form-field">
						<label for="passwordConfirm">Confirm Password</label>
						<input 
							id="passwordConfirm" 
							type="password" 
							bind:value={passwordConfirm} 
							placeholder="••••••••"
							required 
						/>
					</div>
				{/if}

				{#if formError}
					<div class="form-error">{formError}</div>
				{/if}

				<button type="submit" class="submit-btn" disabled={formLoading}>
					{formLoading ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
				</button>
			</form>

			<p class="auth-switch">
				{#if authMode === 'login'}
					Don't have an account? <button class="link-btn" onclick={openRegister}>Sign up</button>
				{:else}
					Already have an account? <button class="link-btn" onclick={openLogin}>Sign in</button>
				{/if}
			</p>
		</div>
	</div>
{/if}

<main>
	<!-- Header with auth -->
	<header>
		<div class="logo">FLI Golf</div>
		<nav>
			{#if auth.isAuthenticated}
				<span class="user-greeting">Welcome, {auth.profile?.display_name ?? 'Player'}</span>
				<button class="nav-btn" onclick={() => auth.logout()}>Sign Out</button>
			{:else}
				<button class="nav-btn" onclick={openLogin}>Sign In</button>
				<button class="nav-btn primary-nav" onclick={openRegister}>Sign Up</button>
			{/if}
		</nav>
	</header>

	<section class="hero">
		<h1>FLI Golf Fantasy League</h1>
		<p class="tagline">Draft your pros. Compete with friends. Win big.</p>
		<div class="cta-buttons">
			{#if auth.isAuthenticated}
				<button class="primary">Create a League</button>
				<button class="secondary">Join a League</button>
			{:else}
				<button class="primary" onclick={openRegister}>Get Started</button>
				<button class="secondary" onclick={openLogin}>Sign In</button>
			{/if}
		</div>
	</section>

	<section class="features">
		<h2>How It Works</h2>
		<div class="feature-grid">
			{#each features as feature}
				<div class="feature-card">
					<span class="icon">{feature.icon}</span>
					<h3>{feature.title}</h3>
					<p>{feature.description}</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="workflow">
		<h2>League Workflow</h2>
		<div class="workflow-steps">
			{#each workflow as item}
				<div class="workflow-step">
					<div class="step-number">{item.step}</div>
					<div class="step-content">
						<h4>{item.title}</h4>
						<span class="status-badge {item.status}">{item.status.replace('_', ' ')}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="scoring">
		<h2>Scoring System</h2>
		<div class="scoring-grid">
			<div class="scoring-category">
				<h3>Tournament Finish</h3>
				<ul>
					<li>1st Place: 100 pts</li>
					<li>2nd Place: 75 pts</li>
					<li>3rd Place: 60 pts</li>
					<li>Top 10: 20-50 pts</li>
				</ul>
			</div>
			<div class="scoring-category">
				<h3>Round Scoring</h3>
				<ul>
					<li>Eagle: +5 pts</li>
					<li>Birdie: +3 pts</li>
					<li>Bogey: -1 pt</li>
					<li>Double+: -2 pts</li>
				</ul>
			</div>
			<div class="scoring-category">
				<h3>Bonuses</h3>
				<ul>
					<li>Hole-in-One: +25 pts</li>
					<li>Round Leader: +5 pts</li>
					<li>Team Bonus: +10 pts</li>
				</ul>
			</div>
		</div>
	</section>

	<section class="tech-stack">
		<h2>Built With</h2>
		<div class="tech-badges">
			<span class="badge">SvelteKit 5</span>
			<span class="badge">TypeScript</span>
			<span class="badge">PocketBase</span>
			<span class="badge">Zod</span>
		</div>
	</section>

	<footer>
		<p>FLI Golf Fantasy League &copy; 2026</p>
	</footer>
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, -apple-system, sans-serif;
		background: #0f172a;
		color: #e2e8f0;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* Header */
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid #1e293b;
	}

	.logo {
		font-size: 1.5rem;
		font-weight: 700;
		color: #22c55e;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-greeting {
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.nav-btn {
		background: transparent;
		color: #e2e8f0;
		border: none;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		cursor: pointer;
		border-radius: 0.375rem;
		transition: background 0.2s;
	}

	.nav-btn:hover {
		background: #1e293b;
	}

	.primary-nav {
		background: #22c55e;
		color: #0f172a;
	}

	.primary-nav:hover {
		background: #16a34a;
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.modal {
		background: #1e293b;
		border-radius: 1rem;
		padding: 2rem;
		width: 100%;
		max-width: 400px;
		position: relative;
		border: 1px solid #334155;
	}

	.modal h2 {
		margin: 0 0 1.5rem;
		text-align: center;
		color: #f8fafc;
	}

	.modal-close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		background: none;
		border: none;
		color: #94a3b8;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		line-height: 1;
	}

	.modal-close:hover {
		color: #f8fafc;
	}

	.form-field {
		margin-bottom: 1rem;
	}

	.form-field label {
		display: block;
		margin-bottom: 0.375rem;
		color: #94a3b8;
		font-size: 0.875rem;
	}

	.form-field input {
		width: 100%;
		padding: 0.75rem;
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 0.5rem;
		color: #f8fafc;
		font-size: 1rem;
		box-sizing: border-box;
	}

	.form-field input:focus {
		outline: none;
		border-color: #22c55e;
	}

	.form-field input::placeholder {
		color: #64748b;
	}

	.form-error {
		background: #7f1d1d;
		color: #fecaca;
		padding: 0.75rem;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.submit-btn {
		width: 100%;
		padding: 0.875rem;
		background: #22c55e;
		color: #0f172a;
		border: none;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.submit-btn:hover:not(:disabled) {
		background: #16a34a;
	}

	.submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.auth-switch {
		text-align: center;
		margin-top: 1.5rem;
		color: #94a3b8;
		font-size: 0.875rem;
	}

	.link-btn {
		background: none;
		border: none;
		color: #22c55e;
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0;
		text-decoration: underline;
	}

	.link-btn:hover {
		color: #16a34a;
	}

	/* Hero */
	.hero {
		text-align: center;
		padding: 4rem 1rem;
		background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
		border-radius: 0 0 2rem 2rem;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 3rem;
		margin: 0;
		background: linear-gradient(90deg, #22c55e, #10b981);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.tagline {
		font-size: 1.25rem;
		color: #94a3b8;
		margin: 1rem 0 2rem;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	button {
		padding: 0.875rem 2rem;
		font-size: 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 600;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	button:hover {
		transform: translateY(-2px);
	}

	.primary {
		background: #22c55e;
		color: #0f172a;
		border: none;
	}

	.primary:hover {
		box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4);
	}

	.secondary {
		background: transparent;
		color: #22c55e;
		border: 2px solid #22c55e;
	}

	.secondary:hover {
		background: rgba(34, 197, 94, 0.1);
	}

	/* Sections */
	section {
		margin-bottom: 4rem;
	}

	h2 {
		text-align: center;
		font-size: 2rem;
		margin-bottom: 2rem;
		color: #f8fafc;
	}

	/* Features */
	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.feature-card {
		background: #1e293b;
		padding: 1.5rem;
		border-radius: 1rem;
		text-align: center;
		border: 1px solid #334155;
		transition: border-color 0.2s;
	}

	.feature-card:hover {
		border-color: #22c55e;
	}

	.icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 1rem;
	}

	.feature-card h3 {
		margin: 0 0 0.5rem;
		color: #f8fafc;
	}

	.feature-card p {
		margin: 0;
		color: #94a3b8;
		font-size: 0.9rem;
	}

	/* Workflow */
	.workflow-steps {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}

	.workflow-step {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: #1e293b;
		padding: 1rem 1.25rem;
		border-radius: 0.75rem;
		border: 1px solid #334155;
	}

	.step-number {
		width: 2rem;
		height: 2rem;
		background: #22c55e;
		color: #0f172a;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
	}

	.step-content h4 {
		margin: 0;
		font-size: 0.9rem;
		color: #f8fafc;
	}

	.status-badge {
		font-size: 0.7rem;
		padding: 0.2rem 0.5rem;
		border-radius: 0.25rem;
		text-transform: uppercase;
		font-weight: 600;
	}

	.status-badge.pending_players { background: #fbbf24; color: #0f172a; }
	.status-badge.ready { background: #3b82f6; color: white; }
	.status-badge.drafting { background: #8b5cf6; color: white; }
	.status-badge.active { background: #22c55e; color: #0f172a; }

	/* Scoring */
	.scoring-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.5rem;
	}

	.scoring-category {
		background: #1e293b;
		padding: 1.5rem;
		border-radius: 0.75rem;
		border: 1px solid #334155;
	}

	.scoring-category h3 {
		margin: 0 0 1rem;
		color: #22c55e;
		font-size: 1.1rem;
	}

	.scoring-category ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.scoring-category li {
		padding: 0.4rem 0;
		color: #cbd5e1;
		font-size: 0.9rem;
		border-bottom: 1px solid #334155;
	}

	.scoring-category li:last-child {
		border-bottom: none;
	}

	/* Tech Stack */
	.tech-badges {
		display: flex;
		justify-content: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.badge {
		background: #334155;
		color: #e2e8f0;
		padding: 0.5rem 1rem;
		border-radius: 2rem;
		font-size: 0.9rem;
		font-weight: 500;
	}

	/* Footer */
	footer {
		text-align: center;
		padding: 2rem;
		color: #64748b;
		border-top: 1px solid #1e293b;
	}

	/* Responsive */
	@media (max-width: 640px) {
		h1 {
			font-size: 2rem;
		}

		.tagline {
			font-size: 1rem;
		}

		.workflow-steps {
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
