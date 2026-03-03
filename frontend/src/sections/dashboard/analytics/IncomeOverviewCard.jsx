import { useState } from 'react';

// material-ui
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import MainCard from 'components/MainCard';
import IconButton from 'components/@extended/IconButton';
import IncomeChart from 'sections/dashboard/analytics/IncomeChart';

// assets
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import CaretDownOutlined from '@ant-design/icons/CaretDownOutlined';

export default function IncomeOverviewCard() {
  const [slot, setSlot] = useState('week');
  const [quantity, setQuantity] = useState('By volume');

  const handleQuantity = (e) => {
    setQuantity(e.target.value);
  };

  const handleChange = (event, newAlignment) => {
    if (newAlignment) setSlot(newAlignment);
  };

  return (
    <MainCard content={false} sx={{ mt: 1.5 }}>
      <Grid>
        <Grid container>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack sx={{ alignItems: { xs: 'center', sm: 'flex-start' }, ml: { xs: 0, sm: 2 }, mt: 3 }}>
              <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', color: 'error.main' }}>
                <CaretDownOutlined />
                <Typography>$1,12,900 (45.67%)</Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ display: 'block' }}>
                Compare to : 01 Dec 2021-08 Jan 2022
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Stack
              direction="row"
              sx={{ gap: 1, alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' }, mt: 3, mr: { xs: 0, sm: 2 } }}
            >
              <ToggleButtonGroup exclusive onChange={handleChange} size="small" value={slot}>
                <ToggleButton disabled={slot === 'week'} value="week" sx={{ px: 2, py: 0.5 }}>
                  Week
                </ToggleButton>
                <ToggleButton disabled={slot === 'month'} value="month" sx={{ px: 2, py: 0.5 }}>
                  Month
                </ToggleButton>
              </ToggleButtonGroup>
              <Select value={quantity} onChange={handleQuantity} size="small">
                <MenuItem value="By volume">By Volume</MenuItem>
                <MenuItem value="By margin">By Margin</MenuItem>
                <MenuItem value="By sales">By Sales</MenuItem>
              </Select>
              <IconButton
                color="secondary"
                size="small"
                sx={{ color: 'text.primary', border: '1px solid', borderColor: 'grey.400', '&:hover': { bgcolor: 'transparent' } }}
              >
                <DownloadOutlined />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Grid>
      <Box sx={{ width: 1, pt: 1 }}>
        <IncomeChart slot={slot} quantity={quantity} />
      </Box>
    </MainCard>
  );
}
