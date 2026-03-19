-- Reconcile legacy members layout with the current unified member entity.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'members'
    ) THEN
        ALTER TABLE members ALTER COLUMN member_card_id DROP NOT NULL;
        ALTER TABLE members ALTER COLUMN date_of_birth DROP NOT NULL;

        UPDATE members
        SET member_card_id = COALESCE(member_card_id, card_number, barcode),
            card_number = COALESCE(card_number, member_card_id),
            birth_date = COALESCE(birth_date, date_of_birth),
            date_of_birth = COALESCE(date_of_birth, birth_date),
            national_number = COALESCE(national_number, national_id),
            national_id = COALESCE(national_id, national_number),
            coverage_start_date = COALESCE(coverage_start_date, start_date),
            coverage_end_date = COALESCE(coverage_end_date, end_date),
            membership_type = COALESCE(membership_type, CASE WHEN parent_id IS NULL THEN 'PRIMARY' ELSE 'DEPENDENT' END),
            relation_to_employee = COALESCE(relation_to_employee, relationship)
        WHERE member_card_id IS NULL
           OR card_number IS NULL
           OR birth_date IS NULL
           OR date_of_birth IS NULL
           OR national_number IS NULL
           OR national_id IS NULL
           OR coverage_start_date IS NULL
           OR coverage_end_date IS NULL
           OR membership_type IS NULL
           OR relation_to_employee IS NULL;

        EXECUTE $member_fn$
            CREATE OR REPLACE FUNCTION sync_member_legacy_columns()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $body$
            BEGIN
                NEW.member_card_id := COALESCE(NEW.member_card_id, NEW.card_number, NEW.barcode);
                NEW.card_number := COALESCE(NEW.card_number, NEW.member_card_id);

                NEW.birth_date := COALESCE(NEW.birth_date, NEW.date_of_birth);
                NEW.date_of_birth := COALESCE(NEW.date_of_birth, NEW.birth_date);

                NEW.national_number := COALESCE(NEW.national_number, NEW.national_id);
                NEW.national_id := COALESCE(NEW.national_id, NEW.national_number);

                NEW.coverage_start_date := COALESCE(NEW.coverage_start_date, NEW.start_date);
                NEW.coverage_end_date := COALESCE(NEW.coverage_end_date, NEW.end_date);

                NEW.membership_type := COALESCE(
                    NEW.membership_type,
                    CASE WHEN NEW.parent_id IS NULL THEN 'PRIMARY' ELSE 'DEPENDENT' END
                );
                NEW.relation_to_employee := COALESCE(NEW.relation_to_employee, NEW.relationship);

                RETURN NEW;
            END;
            $body$;
        $member_fn$;

        DROP TRIGGER IF EXISTS trg_sync_member_legacy_columns ON members;
        CREATE TRIGGER trg_sync_member_legacy_columns
            BEFORE INSERT OR UPDATE ON members
            FOR EACH ROW
            EXECUTE FUNCTION sync_member_legacy_columns();
    END IF;
END $$;