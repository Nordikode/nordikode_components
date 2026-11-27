/**
 * The field for a measurement (SIGN-1980): a length, an area or a volume in
 * SI, written and read the way the user's language writes numbers.
 *
 * A build entry of its own (`dist/floor-plan/fields.js`) for the same reason
 * as `view.ts`: the editor uses the field, but so do small forms outside it —
 * the dialog that makes a blank room — and they should not download the
 * editor to get it. Apps import `@nordikode/components/floor-plan`.
 */
export { default as MeasurementField } from './MeasurementField.vue'
