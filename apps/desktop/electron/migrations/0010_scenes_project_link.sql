ALTER TABLE `scenes` ADD `project_id` text;
--> statement-breakpoint
UPDATE `scenes`
SET `project_id` = (
  SELECT `series`.`project_id`
  FROM `series`
  WHERE `series`.`id` = `scenes`.`series_id`
  LIMIT 1
)
WHERE `project_id` IS NULL OR `project_id` = '';
--> statement-breakpoint
UPDATE `scenes`
SET `project_id` = (
  SELECT `series`.`project_id`
  FROM `shots`
  INNER JOIN `series` ON `series`.`id` = `shots`.`series_id`
  WHERE `shots`.`scene_id` = `scenes`.`id`
  ORDER BY `shots`.`created_at` ASC
  LIMIT 1
)
WHERE `project_id` IS NULL OR `project_id` = '';
--> statement-breakpoint
DELETE FROM `shots`
WHERE `scene_id` IN (
  SELECT `id`
  FROM `scenes`
  WHERE `project_id` IS NULL OR `project_id` = ''
);
--> statement-breakpoint
DELETE FROM `scenes`
WHERE `project_id` IS NULL OR `project_id` = '';
