<!--
  ============================================================================
  Animated, terminal-styled GitHub profile README
  ============================================================================

  Sections:
    1. Fake terminal prompt (whoami)
    2. Side-by-side ASCII portrait + neofetch info card (centered HTML table)
    3. Live contribution heatmap (auto-updated daily via GitHub Actions)

  All SVGs are self-contained and animated with SMIL / CSS keyframes.
  Data is refreshed daily by .github/workflows/update-profile-art.yml
  (no third-party APIs, no personal access tokens required).
  ============================================================================
-->

<p align="center">

  <!-- Fake terminal header -->
  <br />
  <code>
    <span style="color:#569cd6">AIZEN9370</span><span style="color:#cccccc">@github</span>
    <span style="color:#cccccc"> ~ </span><span style="color:#569cd6">$</span>
    <span style="color:#608b4e">./contributions.sh</span>
  </code>
  <br />
  <code>
    <span style="color:#569cd6">whoami</span>
  </code>
  <br />

  <!-- Top-aligned, centered table: portrait left, info card right -->
  <table align="center">
    <tr>
      <td align="left" valign="top">
        <img
          src="data/avi-ascii.svg"
          alt="ASCII portrait"
          width="420"
          style="display:block;"
        />
      </td>
      <td align="left" valign="top" style="padding-left: 24px;">
        <img
          src="data/info-card.svg"
          alt="Neofetch info card"
          width="460"
          style="display:block;"
        />
      </td>
    </tr>
  </table>

  <br />

  <!-- Live contribution heatmap (centered) -->
  <div align="center">
    <img
      src="data/contrib-heatmap.svg"
      alt="Contribution heatmap"
      width="700"
      style="display:block; margin: 0 auto;"
    />
  </div>

  <br />

  <p align="center">
    <em>
      Auto-updated daily via GitHub Actions &bull;
      Built with SVGs, SMIL animations, and zero third-party APIs.
    </em>
  </p>

</p>
