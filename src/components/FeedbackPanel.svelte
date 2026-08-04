<script lang="ts">
let { edited }: { edited: string } = $props();
</script>

<section class="feedback-panel" aria-labelledby="last-update-heading">
  <h2 id="last-update-heading">Last feedback checkpoint</h2>
  <p>{edited}</p>
</section>
