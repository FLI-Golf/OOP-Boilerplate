<script lang="ts">
	import { userSchema, type User } from '$lib/schemas';

	let name = $state('');
	let email = $state('');
	let age = $state('');
	let errors = $state<Record<string, string>>({});
	let submitted = $state<User | null>(null);

	function handleSubmit(e: Event) {
		e.preventDefault();
		errors = {};
		submitted = null;

		const result = userSchema.safeParse({
			name,
			email,
			age: age ? parseInt(age, 10) : undefined
		});

		if (!result.success) {
			for (const issue of result.error.issues) {
				errors[issue.path[0] as string] = issue.message;
			}
		} else {
			submitted = result.data;
		}
	}
</script>

<main>
	<h1>Svelte 5 + Zod Demo</h1>

	<form onsubmit={handleSubmit}>
		<div class="field">
			<label for="name">Name</label>
			<input id="name" type="text" bind:value={name} />
			{#if errors.name}<span class="error">{errors.name}</span>{/if}
		</div>

		<div class="field">
			<label for="email">Email</label>
			<input id="email" type="email" bind:value={email} />
			{#if errors.email}<span class="error">{errors.email}</span>{/if}
		</div>

		<div class="field">
			<label for="age">Age</label>
			<input id="age" type="number" bind:value={age} />
			{#if errors.age}<span class="error">{errors.age}</span>{/if}
		</div>

		<button type="submit">Submit</button>
	</form>

	{#if submitted}
		<div class="success">
			<h2>Validated User</h2>
			<pre>{JSON.stringify(submitted, null, 2)}</pre>
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 400px;
		margin: 2rem auto;
		font-family: system-ui, sans-serif;
	}

	.field {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.25rem;
		font-weight: 500;
	}

	input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}

	.error {
		color: #dc2626;
		font-size: 0.875rem;
		margin-top: 0.25rem;
		display: block;
	}

	button {
		background: #4f46e5;
		color: white;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	button:hover {
		background: #4338ca;
	}

	.success {
		margin-top: 1.5rem;
		padding: 1rem;
		background: #ecfdf5;
		border: 1px solid #10b981;
		border-radius: 4px;
	}

	.success h2 {
		margin: 0 0 0.5rem;
		color: #065f46;
	}

	pre {
		margin: 0;
		background: white;
		padding: 0.5rem;
		border-radius: 4px;
	}
</style>
