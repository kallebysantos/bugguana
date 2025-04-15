#!/bin/bash

supabase gen types --local --lang typescript | tee \
  supabase/functions/_shared/supabase/types.ts
