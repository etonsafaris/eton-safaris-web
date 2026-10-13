/** National parks — same ISR bundle as /parks/[slug] (15-minute ISR). */
export const revalidate = 900;
export {
  default,
  generateMetadata,
  generateStaticParams,
  dynamicParams,
} from '../../parks/[slug]/page';
