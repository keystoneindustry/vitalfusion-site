/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep links from the old Emergent site working after the switch.
  async redirects() {
    return [
      { source: "/application", destination: "/apply", permanent: true },
      { source: "/vital-method-application", destination: "/apply?source=vital-method", permanent: true },
    ];
  },
};
export default nextConfig;
